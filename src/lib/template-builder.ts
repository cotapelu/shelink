/**
 * v0.8: Built-in Document Templates
 *
 * Each template defines:
 * - name, category, description
 * - applicableCategories (empty = all)
 * - variables (merge fields)
 * - buildBuffer(): returns DOCX buffer with docxtemplater-rendered content
 */

import PizZip from "pizzip";
import type { MatterCategory } from "@prisma/client";

const FIRM = {
  name: "LawLink 律师事务所",
  address: "北京市朝阳区建国门外大街1号",
  phone: "010-12345678",
  licenseNo: "京司律证字第12345678号"
};

interface Template {
  name: string;
  category: "INTAKE" | "RETAINER" | "LITIGATION" | "HEARING" | "WORK_PRODUCT" | "ARCHIVE" | "CLOSING" | "BLANK";
  description: string;
  applicableCategories: MatterCategory[];
  variables: string[];
  buildBuffer(): Buffer;
}

// Helper: Create DOCX buffer
function createDocxBuffer(title: string, body: string, variables: string[]): Buffer {
  const zip = new PizZip();

  const mergeFields = variables.map(v =>
    `<w:fldChar w:fldCharType="begin"/><w:r><w:instrText xml:space="preserve"> MERGEFIELD ${v} \\* MERGEFORMAT </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/><w:r><w:t>{{{${v}}}}</w:t></w:r>`
  ).join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:rFonts w:hint="default"/></w:rPr>
        <w:t>${title}</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>${body}</w:t></w:r></w:p>
    ${mergeFields}
    <w:p><w:r><w:t>生成时间：{{generatedAt}}</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  zip.file("word/document.xml", documentXml);
  zip.file("[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

// 8 Templates
export const BUILTIN_TEMPLATES: Template[] = [
  {
    name: "收案登记表",
    category: "INTAKE",
    description: "收案时登记基本信息、委托方信息、案由等。",
    applicableCategories: [],
    variables: ["matter.internalCode", "matter.title", "client.name", "client.idNumber", "client.phone", "client.address", "cause.name", "intake.receivedAt", "intake.description", "lawyer.name", "intake.note", "generatedAt"],
    buildBuffer() {
      return createDocxBuffer(this.name, `${FIRM.name}
收案登记表

案件编号：{{{matter.internalCode}}}
收案日期：{{{intake.receivedAt}}}

一、委托方信息
姓名/名称：{{{client.name}}}
证件号码：{{{client.idNumber}}}
联系电话：{{{client.phone}}}
联系地址：{{{client.address}}}

二、案件信息
案由：{{{cause.name}}}
简要描述：{{{intake.description}}}

三、接待律师
{{{lawyer.name}}}

四、备注
{{{intake.note}}}

本登记表仅作内部备案使用。`, this.variables);
    }
  },
  {
    name: "委托代理合同",
    category: "RETAINER",
    description: "标准委托代理合同，含费用、付款节点、权利义务。",
    applicableCategories: [],
    variables: ["firm.name", "firm.address", "firm.phone", "firm.licenseNo", "client.name", "client.idNumber", "client.address", "matter.title", "matter.category", "fee.amount", "fee.type", "fee.schedule", "lawyer.name", "generatedAt"],
    buildBuffer() {
      return createDocxBuffer(this.name, `${FIRM.name}
委托代理合同

甲方（委托人）：{{{client.name}}}
身份证号/统一社会信用代码：{{{client.idNumber}}}
联系地址：{{{client.address}}}

乙方（受托人）：${FIRM.name}
统一社会信用代码：${FIRM.licenseNo}
联系地址：${FIRM.address}
联系电话：${FIRM.phone}

第一条 委托事项
甲方因{{{matter.title}}}一案，委托乙方提供法律服务。

第二条 服务范围
乙方指派 {{{lawyer.name}}} 律师担任本案的主办律师。

第三条 律师服务费
1. 计费方式：{{{fee.type}}}
2. 费用金额：人民币{{{fee.amount}}}元
3. 付款节点：{{{fee.schedule}}}

第四条 双方权利义务
（详见合同标准条款）

第五条 合同生效
本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。

甲方（签字/盖章）：___________
日期：___________

乙方（盖章）：${FIRM.name}
日期：___________
`, this.variables);
    }
  },
  {
    name: "民事起诉状",
    category: "LITIGATION",
    description: "民事诉讼起诉状标准模板。",
    applicableCategories: ["CIVIL_COMMERCIAL", "CRIMINAL", "ADMINISTRATIVE"],
    variables: ["firm.name", "client.name", "client.idNumber", "client.address", "parties.defendants[0].name", "parties.defendants[0].idNumber", "parties.defendants[0].address", "matter.cause.name", "matter.claimAmount", "court.name", "generatedAt"],
    buildBuffer() {
      return createDocxBuffer(this.name, `${FIRM.name}
民事起诉状

原告：{{{client.name}}}
身份证号：{{{client.idNumber}}}
住址：{{{client.address}}}

被告：{{{parties.defendants[0].name}}}
身份证号/统一社会信用代码：{{{parties.defendants[0].idNumber}}}
住址：{{{parties.defendants[0].address}}}

诉讼请求
1. 判令被告支付 {{{matter.claimAmount}}} 元；
2. 本案诉讼费用由被告承担。

事实与理由
原告与被告因{{{matter.cause.name}}}纠纷，被告未能履行合同义务，严重损害原告合法权益。
根据《中华人民共和国民法典》等相关法律规定，原告特向贵院提起诉讼，请求依法判决。

此致
{{{court.name}}}

具状人（原告）：{{{client.name}}}
${new Date().getFullYear()}年${new Date().getMonth()+1}月${new Date().getDate()}日
附：证据清单
`, this.variables);
    }
  },
  {
    name: "谈话笔录",
    category: "HEARING",
    description: "与当事人或证人的谈话记录。",
    applicableCategories: [],
    variables: ["matter.internalCode", "lawyer.name", "client.name", "client.idNumber", "interviewee.name", "interviewee.relationship", "interviewee.phone", "interview.date", "interview.content", "generatedAt"],
    buildBuffer() {
      return createDocxBuffer(this.name, `${FIRM.name}
谈话笔录

案件编号：{{{matter.internalCode}}}
会见律师：{{{lawyer.name}}}

时间：{{{interview.date}}}
地点：${FIRM.address}
记录人：{{{lawyer.name}}}

被谈话人：{{{interviewee.name}}}
与当事人关系：{{{interviewee.relationship}}}
联系电话：{{{interviewee.phone}}}

谈话内容：
{{{interview.content}}}

谈话人（签字）：___________
被谈话人（签字）：___________
日期：{{{interview.date}}}
`, this.variables);
    }
  },
  {
    name: "法律意见书",
    category: "WORK_PRODUCT",
    description: "针对具体法律问题的专业意见。",
    applicableCategories: [],
    variables: ["firm.name", "firm.address", "firm.phone", "client.name", "matter.title", "matter.cause.name", "lawyer.name", "opinion.date", "opinion.background", "opinion.analysis", "opinion.conclusion", "generatedAt"],
    buildBuffer() {
      return createDocxBuffer(this.name, `${FIRM.name}
法律意见书

致：{{{client.name}}}

发件人：${FIRM.name}
地址：${FIRM.address}
电话：${FIRM.phone}  
日期：{{{opinion.date}}}

事由：关于{{{matter.title}}}的法律意见

一、基本事实
{{{opinion.background}}}

二、法律分析
{{{opinion.analysis}}}

三、结论与建议
{{{opinion.conclusion}}}

承办律师：{{{lawyer.name}}}

${FIRM.name}（盖章）
${new Date().getFullYear()}年${new Date().getMonth()+1}月${new Date().getDate()}日
`, this.variables);
    }
  },
  {
    name: "卷宗目录",
    category: "ARCHIVE",
    description: "归档卷宗的文件目录。",
    applicableCategories: [],
    variables: ["matter.internalCode", "matter.title", "client.name", "matter.category", "archive.date", "folder.name", "documents[].name", "documents[].date", "generatedAt"],
    buildBuffer() {
      return createDocxBuffer(this.name, `${FIRM.name}
卷宗目录

案件编号：{{{matter.internalCode}}}
案件名称：{{{matter.title}}}
委托人：{{{client.name}}}
案件类别：{{{matter.category}}}
归档日期：{{{archive.date}}}

卷宗名称：{{{folder.name}}}

序号\t文件名称\t日期\t备注
{{#documents}}
{{@index + 1}}\t{{{name}}}\t{{{date}}}\t
{{/documents}}

保管人：___________
检查人：___________
归档日期：{{{archive.date}}}
`, this.variables);
    }
  },
  {
    name: "结案登记表",
    category: "CLOSING",
    description: "案件结案时填写，含办案小结。",
    applicableCategories: [],
    variables: ["matter.internalCode", "matter.title", "client.name", "matter.category", "lawyer.name", "matter.closedAt", "closure.reason", "closure.summary", "generatedAt"],
    buildBuffer() {
      return createDocxBuffer(this.name, `${FIRM.name}
结案登记表

一、案件基本信息
案件编号：{{{matter.internalCode}}}
案件名称：{{{matter.title}}}
委托人：{{{client.name}}}
案件类别：{{{matter.category}}}
主办律师：{{{lawyer.name}}}

二、结案情况
结案日期：{{{matter.closedAt}}}
结案原因：{{{closure.reason}}}

三、办案小结
{{{closure.summary}}}

四、归档情况
□ 材料完整
□ 材料缺失（详见备注）

归档人：___________
归档日期：{{{matter.closedAt}}}

备注：_______________
`, this.variables);
    }
  },
  {
    name: "风险告知书",
    category: "BLANK",
    description: "向客户告知法律服务的潜在风险。",
    applicableCategories: [],
    variables: ["client.name", "client.idNumber", "matter.category", "matter.cause.name", "risk.items[].description", "risk.items[].level", "generatedAt"],
    buildBuffer() {
      return createDocxBuffer(this.name, `${FIRM.name}
法律服务风险告知书

致：{{{client.name}}}

根据《律师法》及相关规定，本所现就{{{matter.category}}}案件（案由：{{{matter.cause.name}}}）相关风险告知如下：

一、诉讼风险
1. 证据不足风险：案件可能因证据不足而败诉。
2. 法律适用风险：案件结果可能因法律法规变化而受到影响。
3. 执行风险：即使胜诉，对方可能无财产可供执行。

二、收费方式
本次法律服务采用风险代理方式，具体详见委托代理合同。

三、其他告知
1. 律师承诺勤勉尽责，但不承诺案件必然胜诉。
2. 委托人应如实提供案件材料，配合律师工作。
3. 案件进程可能因客观原因延长。

我已阅读并理解上述风险告知内容。

委托人（签字）：___________
日期：___________

律师事务所（盖章）：
${FIRM.name}
`, this.variables);
    }
  }
];
